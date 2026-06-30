Feature: Rate recipes with stars
  As someone curating my own recipe collection
  I want to rate recipes and change or clear those ratings
  So that my own opinion drives browsing, planning and cleanup

  Background:
    Given no recipes have been rated

  Scenario: Rating a recipe stores its stars
    When I rate recipe "r1" 5 stars
    Then recipe "r1" has 5 stars

  Scenario: Re-rating a recipe replaces the previous stars
    Given I have rated recipe "r1" 3 stars
    When I rate recipe "r1" 1 star
    Then recipe "r1" has 1 star

  Scenario: Clearing the only rating on a recipe removes its row
    Given I have rated recipe "r1" 4 stars
    When I clear the rating on recipe "r1"
    Then recipe "r1" has no curation row

  Scenario: Clearing a rating keeps the row when it carries notes
    Given recipe "r1" is rated 4 stars and has a note "great with rice"
    When I clear the rating on recipe "r1"
    Then recipe "r1" has no stars
    But recipe "r1" still has the note "great with rice"

  Scenario: Setting a rotation stores it
    When I set the rotation on recipe "r1" to 5
    Then recipe "r1" has rotation 5

  Scenario: Stars and rotation live together on one recipe
    Given I have rated recipe "r1" 5 stars
    When I set the rotation on recipe "r1" to 1
    Then recipe "r1" has 5 stars
    And recipe "r1" has rotation 1

  Scenario: Clearing the rating keeps the row when it carries a rotation
    Given I have rated recipe "r1" 4 stars
    And I have set the rotation on recipe "r1" to 4
    When I clear the rating on recipe "r1"
    Then recipe "r1" has no stars
    But recipe "r1" has rotation 4

  Scenario: Clearing the only rotation on a recipe removes its row
    Given I have set the rotation on recipe "r1" to 2
    When I clear the rotation on recipe "r1"
    Then recipe "r1" has no curation row

  Scenario: Clearing curation removes both stars and rotation at once
    Given I have rated recipe "r1" 3 stars
    And I have set the rotation on recipe "r1" to 5
    When I clear the curation on recipe "r1"
    Then recipe "r1" has no curation row

  Scenario: Clearing curation keeps the row when it carries a note
    Given recipe "r1" is rated 4 stars and has a note "great with rice"
    When I clear the curation on recipe "r1"
    Then recipe "r1" has no stars
    But recipe "r1" still has the note "great with rice"
