Feature: Edit a recipe in the full view
  As someone curating my collection
  I want to fix a recipe's title, blurb and card number
  So the recipe reads the way I want and carries my own recipe-card reference

  Background:
    Given the app starts with no recipes
    And the store holds recipe "r1"

  Scenario: Editing the title and description persists
    When I edit recipe "r1" with title "Weeknight Ragu" and description "Rich, quick, freezable"
    Then recipe "r1" has title "Weeknight Ragu"
    And recipe "r1" has description "Rich, quick, freezable"

  Scenario: Setting a card number
    When I edit recipe "r1" with card number "R1196"
    Then recipe "r1" has card number "R1196"

  Scenario: A blank card number clears it
    Given recipe "r1" has card number "R1196"
    When I edit recipe "r1" with card number ""
    Then recipe "r1" has no card number

  Scenario: A blank title is rejected and the existing title is kept
    When I edit recipe "r1" with title "   "
    Then recipe "r1" has title "Recipe r1"
