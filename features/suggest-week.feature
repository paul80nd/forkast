Feature: Suggest a varied week
  As someone planning the household's week
  I want the app to propose a balanced set of meals from my shortlist
  So that I don't assemble a varied week by hand

  Background:
    Given a clean collection

  Scenario: Only keepers (★3+) are suggested
    Given recipes "r1" rated 4 stars
    And recipes "r2" rated 2 stars
    And recipe "r3" is unrated
    When I suggest a week of 5
    Then the suggestions are exactly "r1"

  Scenario: Unrated recipes are drawn in when opted in, but never binned ones
    Given recipes "r1" rated 4 stars
    And recipes "r2" rated 1 stars
    And recipe "r3" is unrated
    When I suggest a week of 5 including unrated
    Then the suggestions are exactly "r1, r3"

  Scenario: A no-go recipe is never suggested
    Given recipes "r1" rated 4 stars
    And recipe "fishy" rated 4 stars with allergen "fish"
    When I suggest a week of 5
    Then the suggestions are exactly "r1"

  Scenario: Already-planned recipes are excluded and only remaining slots filled
    Given recipes "r1, r2" rated 4 stars
    And recipe "r1" is on the plan
    When I suggest a week of 5
    Then the suggestions are exactly "r2"

  Scenario: A recently-cooked recipe is not suggested
    Given recipes "r1, r2" rated 4 stars
    And recipe "r1" was cooked today
    When I suggest a week of 5
    Then the suggestions are exactly "r2"

  Scenario: Only one member of a variant group is suggested
    Given recipes "r1" rated 5 stars
    And recipes "r2, r3" rated 4 stars
    And recipes "r1, r2" are a variant group
    When I suggest a week of 5
    Then the suggestions are exactly "r1, r3"

  Scenario: A locked (taken) recipe is not re-suggested
    Given recipes "r1, r2" rated 4 stars
    When I suggest a week of 5 keeping "r1"
    Then the suggestions are exactly "r2"

  Scenario: A rejected (rerolled) recipe is excluded
    Given recipes "r1, r2" rated 4 stars
    When I suggest a week of 5 excluding "r1"
    Then the suggestions are exactly "r2"

  Scenario: Accepting the suggestions adds them to the plan
    Given recipes "r1, r2" rated 4 stars
    When I suggest a week of 5
    And I accept the suggestions
    Then the plan contains "r1"
    And the plan contains "r2"
